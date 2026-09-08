// The browser sends answers, not prices or email HTML. The server recalculates.
export function buildSubmission(ans, requestId, photos) {
  const allowed = ['jobType', 'subtype', 'metres', 'depth', 'width', 'exposureCount', 'exposureDepth', 'leakArea', 'pitSize', 'pitFill', 'boreDist', 'otherDescription', 'access', 'ground', 'congestion', 'spoil', 'spoilVolume', 'suburb', 'postcode', 'name', 'mobile', 'email', 'address', 'siteNotes', 'accessNotes', 'preferredDay', 'timingNotes', 'acceptedTerms'];
  const answers = Object.fromEntries(allowed.filter(k => ans[k] !== undefined).map(k => [k, ans[k]]));
  return {
    requestId,
    answers,
    photos,
    website: ''
  };
}
export async function preparePhotos(files = []) {
  if (files.length > 5) throw new Error('Please select no more than five photos.');
  const photos = [];
  for (const file of files) {
    if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} is too large. Please choose a photo under 10 MB.`);
    const photo = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(`Could not read ${file.name}. Try a JPG, PNG or WebP photo.`));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error(`Could not open ${file.name}. Please use JPG, PNG or WebP.`));
        image.onload = () => {
          const scale = Math.min(1, 1600 / image.width, 1600 / image.height);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Photo processing is unavailable. Please send photos to James by email.'));
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          let quality = .82,
            data = canvas.toDataURL('image/jpeg', quality);
          while (data.length > 480000 && quality > .35) {
            quality -= .12;
            data = canvas.toDataURL('image/jpeg', quality);
          }
          if (data.length > 480000) return reject(new Error(`${file.name} is too detailed to send here. Please choose a smaller image or email it to James.`));
          resolve({
            filename: `site-photo-${photos.length + 1}.jpg`,
            contentType: 'image/jpeg',
            content: data.split(',')[1]
          });
        };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
    photos.push(photo);
  }
  return photos;
}
