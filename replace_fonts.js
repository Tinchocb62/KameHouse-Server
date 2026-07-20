import fs from 'fs';
import path from 'path';

function walk(dir, callback) {
    fs.readdir(dir, function(err, list) {
        if (err) return callback(err);
        let pending = list.length;
        if (!pending) return callback(null);
        list.forEach(function(file) {
            file = path.resolve(dir, file);
            fs.stat(file, function(err, stat) {
                if (stat && stat.isDirectory()) {
                    walk(file, function(err) {
                        if (!--pending) callback(null);
                    });
                } else {
                    if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css') || file.endsWith('.html')) {
                        let content = fs.readFileSync(file, 'utf8');
                        if (content.includes('font-bebas')) {
                            let newContent = content.replace(/font-bebas/g, 'font-display');
                            fs.writeFileSync(file, newContent, 'utf8');
                            console.log('Updated', file);
                        }
                    }
                    if (!--pending) callback(null);
                }
            });
        });
    });
}

walk(path.resolve('d:/Proyectos_personales/KameHouse/apps/web'), (err) => {
    if (err) throw err;
    console.log('Done');
});
