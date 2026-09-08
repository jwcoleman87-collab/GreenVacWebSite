import base64,json,mimetypes
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'review-output'; OUT.mkdir(exist_ok=True)
js=next((ROOT/'get-a-quote/assets').glob('*.js')).read_text();css=next((ROOT/'get-a-quote/assets').glob('*.css')).read_text()
font=base64.b64encode((ROOT/'fonts/montserrat-latin.woff2').read_bytes()).decode()

def embed_images(page):
    for im in page.locator('img').all():
        src=im.get_attribute('src') or ''
        if src.startswith('/images/') and (ROOT/src.lstrip('/')).is_file():
            f=ROOT/src.lstrip('/');mime=mimetypes.guess_type(str(f))[0] or 'image/webp';data='data:'+mime+';base64,'+base64.b64encode(f.read_bytes()).decode()
            im.evaluate('(el,data)=>{el.parentElement.querySelectorAll("source").forEach(x=>x.remove());el.removeAttribute("srcset");el.src=data;}',data)
    page.wait_for_timeout(40)

def capture_sheet(page, path):
    style=page.add_style_tag(content='.topbar,.footer-wrap{visibility:hidden!important}')
    page.locator('.gv-sheet').screenshot(path=path)
    style.evaluate('(el)=>el.remove()')

def start(b,width):
    page=b.new_page(viewport={'width':width,'height':900});page.set_default_timeout(3000)
    page.set_content('<html lang="en-AU"><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>')
    page.add_style_tag(content=css+f"\n@font-face{{font-family:Montserrat;src:url(data:font/woff2;base64,{font}) format('woff2');font-weight:100 900;}}")
    page.evaluate('''()=>{window.__posts=[];window.__leads=[];window.__reply={success:true,reference:'GV-DEMO123456',emailCopy:'accepted',photoCount:0};window.GreenVacAnalytics={createEventId:()=> 'estimator-browser-1234567890',trackEstimatorLead:(x)=>window.__leads.push(x)};window.fetch=async (url,options)=>{if(url!='/api/estimate')throw Error('Unexpected endpoint');window.__posts.push(JSON.parse(options.body));return new Response(JSON.stringify(window.__reply),{status:window.__reply.success?200:503,headers:{'Content-Type':'application/json'}});}}''')
    page.add_script_tag(content=js);page.add_style_tag(content=f"@font-face{{font-family:Montserrat;src:url(data:font/woff2;base64,{font}) format('woff2');font-weight:100 900;}}");embed_images(page);return page

def result(page,suburb='Canberra'):
    page.get_by_role('button',name='Trenching Narrow trenches').click()
    page.get_by_role('button',name='Electrical Trench',exact=True).click()
    page.get_by_role('button',name='Continue to job details',exact=True).click()
    page.get_by_role('button',name='10 m',exact=True).click()
    page.get_by_role('button',name='Reduce trench length').click()
    page.get_by_role('button',name='300 mm A shallow run').click()
    page.get_by_role('button',name='Standard — About 300 mm Standard trench width').click()
    page.get_by_role('button',name='Continue to site details').click()
    page.get_by_placeholder('Suburb *',exact=True).fill(suburb)
    page.get_by_role('button',name='Open Access Open lawn').click()
    page.get_by_role('button',name='Normal / Soft Typical soil').click()
    page.get_by_role('button',name='No Known Services Nothing').click()
    page.get_by_role('button',name='Remove It Include removal').click()
    page.get_by_role('button',name='Show My Ballpark Price').click()
    embed_images(page)
    return page.locator('.gv-sheet').inner_text()

def review(page,email='customer@example.test',photo=False):
    page.get_by_role('button',name='Ask James to',exact=False).click()
    page.get_by_role('textbox',name='Full name',exact=True).fill('Sample Customer')
    page.get_by_role('textbox',name='Mobile number',exact=True).fill('0400000000')
    page.get_by_role('textbox',name='Email address',exact=True).fill(email)
    page.get_by_role('textbox',name='Street address',exact=True).fill('Example job address')
    page.get_by_role('textbox',name='Access notes',exact=True).fill('Parking available near the side gate.')
    page.get_by_role('button',name='Within a Week',exact=True).click()
    if photo:
        from PIL import Image
        f=OUT/'sample-site-photo.jpg';Image.new('RGB',(800,600),(220,220,220)).save(f)
        page.locator('#site-photos').set_input_files(str(f))
    page.get_by_role('button',name='Review My Request').click()
    embed_images(page)
    page.get_by_role('button',name='I understand this is an indicative estimate',exact=False).click() if 'Including GST' in page.locator('.gv-sheet').inner_text() else page.get_by_role('button',name='I understand no price has been given',exact=False).click()

with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    report=[]
    for width in [320,390,768,1440]:
        page=start(b,width);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        text=result(page)
        assert '$748 – $825' in text,text
        for private in ['m³','$85','0.81','multiplier','analytics_event_id']:assert private not in text,private
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'),width
        assert page.evaluate('window.__leads.length')==0
        amount=page.locator('.gv-sheet-amount').bounding_box();assert amount['y']+amount['height']<900
        if width==390:
            capture_sheet(page, str(OUT/'customer-sheet-mobile.png'))
            review(page,photo=True)
            page.get_by_role('button',name='Send Estimate Request',exact=True).click()
            page.get_by_text('Thanks — your request is with GreenVac',exact=True).wait_for()
            assert page.evaluate('window.__posts.length')==1
            assert page.evaluate('window.__posts[0].photos.length')==1
            assert page.evaluate('window.__leads.length')==1
            embed_images(page)
            capture_sheet(page, str(OUT/'customer-sheet-personalised.png'))
            page.pdf(path=str(OUT/'GreenVac-example-estimate.pdf'),format='A4',print_background=True,prefer_css_page_size=True)
        if width==1440: capture_sheet(page, str(OUT/'customer-sheet-desktop.png'))
        assert not errors,errors
        print('passed width',width,flush=True);report.append(f'Priced result at {width}px: correct total, no internal workings, no horizontal overflow, price above fold')
        page.close()
    page=start(b,390);text=result(page,'Goulburn');assert '$' not in text and 'No automatic estimate' in text
    review(page,email='');page.evaluate("window.__reply.emailCopy='not_requested'")
    page.get_by_role('button',name='Send Estimate Request',exact=True).click();page.get_by_text('Thanks — your request is with GreenVac',exact=True).wait_for()
    assert '$' not in page.locator('.gv-sheet').inner_text();embed_images(page);capture_sheet(page, str(OUT/'manual-review-sheet.png'));report.append('Manual-pricing result, review and receipt contain no invented price; missing email is handled honestly');page.close()
    page=start(b,390);result(page);review(page);page.evaluate("window.__reply={success:false,message:'Sending is temporarily unavailable.'}")
    page.get_by_role('button',name='Send Estimate Request',exact=True).click();page.get_by_role('alert').wait_for();assert page.evaluate('window.__leads.length')==0
    page.evaluate("window.__reply={success:true,reference:'GV-TEST',emailCopy:'failed',photoCount:0}")
    page.get_by_role('button',name='Try Sending Again',exact=True).click();page.get_by_text('Thanks — your request is with GreenVac',exact=True).wait_for()
    assert page.evaluate('window.__leads.length')==1
    assert 'there is no need to submit the job again' in page.locator('body').inner_text()
    assert page.evaluate('window.__posts[0].requestId===window.__posts[1].requestId')
    report.append('Failed send does not advance or fire a lead; retry succeeds once; failed customer copy does not invite duplicate submission')
    page.close();b.close()
    (OUT/'browser-test-report.json').write_text(json.dumps({'passed':len(report),'checks':report,'network':'No external requests. Built UI executed with a mocked send response; API/provider behavior tested separately.'},indent=2))
    print(json.dumps(report,indent=2))
