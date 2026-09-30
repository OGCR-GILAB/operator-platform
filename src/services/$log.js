class $log {
  standard(obj) {
    console.log(obj)
  }

  success(message) {
    console.log(`%c${message}`, 'color: green; font-weight: bold;');
  }

  error(message) {
    console.log(`%c${message}`, 'color: red; font-weight: bold;');
  }

  warning(message) {
    console.log(`%c${message}`, 'color: orange; font-weight: bold;');
  }

  emphasize(message) {
    console.log(`%c>>>>>>>>>>>>>>>><<<<<<<<<<<<<<<<<<<`, 'color: magenta; font-weight: bold;');
    console.log(`%c${message}`, 'color: magenta; font-weight: bold;');
    console.log(`%c>>>>>>>>>>>>>>>><<<<<<<<<<<<<<<<<<<`, 'color: magenta; font-weight: bold;');

  }
}

export default new $log();