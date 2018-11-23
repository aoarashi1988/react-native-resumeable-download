
class Listener {
  constructor() {
    this.handles = []
  }

  emit = (event, ...param) => {
    for (let index = 0; index < this.handles.length; index++) {
      const eventObj = this.handles[index]
      if (eventObj.event === event) {
        eventObj.handle.call(this, ...param)
      }
    }
  }

  on = (event, handle) => {
    if ('undefined' === typeof event) throw 'at least 2 arguments are required, but got 0'
    if ('undefined' === typeof handle) throw 'at least 2 arguments are required, but got 1'
    if ('function' !== typeof handle) throw 'handle is not a function !'
    for (let index = 0; index < this.handles.length; index++) {
      const eventObj = this.handles[index]
      if (eventObj.handle === handle && eventObj.event === event) {
        return
      }
    }
    this.handles.push({
      event,
      handle,
    })
  }

  off = (event, handle) => {
    if ('undefined' === typeof event) throw 'at least 2 arguments are required, but got 0'
    if (handle && 'function' !== typeof handle) throw 'handle is not a function !'
    for (let index = 0; index < this.handles.length; index++) {
      const eventObj = this.handles[index]
      if (handle) {
        if (eventObj.event === event && eventObj.handle === handle) {
          this.handles.splice(index, 1)
        }
      } else {
        if (eventObj.event === event) {
          this.handles.splice(index, 1)
        }
      }
    }
  }
}

export default Listener
