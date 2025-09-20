const posthtml = require('posthtml');
const include = require('posthtml-include');
const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'src', 'pages');
const outputDir = __dirname;

fs.readdir(sourceDir, (err, files) => {
    if (err) {
        console.error('Error reading source directory:', err);
        return;
    }

    files.forEach(file => {
        if (path.extname(file) === '.html') {
            const sourceFile = path.join(sourceDir, file);
            const outputFile = path.join(outputDir, file);

            fs.readFile(sourceFile, 'utf8', (err, html) => {
                if (err) {
                    console.error(`Error reading file ${sourceFile}:`, err);
                    return;
                }

                posthtml([ include({ root: path.join(__dirname, 'src') }) ])
                    .process(html)
                    .then(result => {
                        fs.writeFile(outputFile, result.html, err => {
                            if (err) {
                                console.error(`Error writing file ${outputFile}:`, err);
                            } else {
                                console.log(`Successfully built ${file}`);
                            }
                        });
                    });
            });
        }
    });
});
