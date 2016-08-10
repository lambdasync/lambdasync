function jsonStringify(obj) {
  return JSON.stringify(obj, null, '  ');
}

module.exports = {
  jsonStringify
};
