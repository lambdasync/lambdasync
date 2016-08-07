import fs from 'fs';

export function readFile(path, transform = input => input) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) {
        return reject(err);
      }
      try {
        return transform(data);
      } catch (err) {
        return reject(err);
      }
    });
  });
}

export function writeFile(path, obj, transform = input => input.toString()) {
  return new Promise((resolve, reject) => {
    let content = '';
    try {
      content = transform(obj);
    } catch (err) {
      return reject(err);
    }

    fs.writeFile(path, content, 'utf8', err => {
      if (err) {
        return reject(err);
      }
      return resolve();
    });
  });
}
