const posthtml = require('posthtml');
     const include = require('posthtml-include');
     const fs = require('fs');
     const path = require('path');
     
     const sourceDir = path.join(__dirname, 'src', 'pages');
     const outputDir = __dirname;
     const dataDir = path.join(__dirname, 'data');
    
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
    
                    const homepageData = JSON.parse(fs.readFileSync(path.join(dataDir, 'homepage.json'), 'utf8'));
   
                    posthtml([
                        include({ root: path.join(__dirname, 'src') }),
                        expressions({ locals: { homepage: homepageData } })
                    ])
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

  