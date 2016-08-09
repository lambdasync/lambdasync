const cp = require('child_process');

function promisedExec(command, options) {
  return new Promise((resolve, reject) => {
    cp.exec(command, options = {}, (err, stdout, stderr) => {
      if (err) {
        return reject(err);
      }

      resolve(stdout);
    });
  });
}

module.exports = {
  promisedExec
};
