const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imgDir = path.join(__dirname, 'images');
const files = fs.readdirSync(imgDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f) && f !== 'logo.png');

(async () => {
  for (const file of files) {
    const input = path.join(imgDir, file);
    const stats = fs.statSync(input);
    const sizeBefore = (stats.size / 1024).toFixed(0);

    const outName = file.replace(/\.(jpg|jpeg|png)$/i, '.jpg');
    const output = path.join(imgDir, '_compressed_' + outName);

    await sharp(input)
      .resize(1600, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, progressive: true })
      .toFile(output);

    const sizeAfter = (fs.statSync(output).size / 1024).toFixed(0);
    console.log(`${file}: ${sizeBefore}KB → ${sizeAfter}KB`);

    // Replace original with compressed version
    fs.unlinkSync(input);
    fs.renameSync(output, path.join(imgDir, outName));
  }
  console.log('\nAll images compressed.');
})();
