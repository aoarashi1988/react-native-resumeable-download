import Util from './Util';
import RNFS from 'react-native-fs';
import Listener from './Listener';

export type TaskOption = {
    id?: string,
    url: string,
    path: string,
    doneSize?: number,
    state?: number,
    begin?: Function,
    progress?: Function,
    success?: Function,
    error?: Function,
    timeout?: number,
    onTimout?: Function,
}

const STATE = {
    FAIL: -1,
    DOWNLOADING: 0,
    SUCCESS: 1,
    CANCEL: 3,
    PAUSE: 4,
}

export default class DownloadTask {
    constructor(props: TaskOption) {
        this.option = {
            id: props.id || Util.randomUUID(),
            url: props.url,
            path: props.path,
            doneSize: props.doneSize || 0,
            state: props.state || STATE.PAUSE,
            timeout: props.timeout || 30,
            begin: props.begin || function () { },
            progress: props.progress || function () { },
            success: props.success || function () { },
            error: props.error || function () { },
            onTimeout: props.onTimout || function(){},
        }
    }

    static STATE = STATE

    blockSize = 1024 * 512

    listener = new Listener()

    _xhr = null

    _onSuccess = (): void => {
        this.setState({state: STATE.SUCCESS})
        const { success, id, size } = this.option
        console.log('download success', this.option)
        success({ id, size })
        this.listener.emit('success', {id, size})
    }

    setState = (newState): void => {
        this.option = {
            ...this.option,
            ...newState
        }
    }

    _onBegin = (): void => {
        const { begin,...option } = this.option
        this.setState({state: STATE.DOWNLOADING})
        begin(option)
    }

    _onReadyStateChange = (): void => {
        const { _xhr } = this
        console.log('ready state change', _xhr.readyState)
        if (_xhr.readyState === 2) {
            let {size: oldSize} = this.option
            const size = Number(_xhr.responseHeaders['Content-Range'].split('/')[1]) 
            this.setState({ size })
            oldSize || this._onBegin()
        }
    }

    _onError = (err): void => {
        this.setState({state: STATE.FAIL})
        const { id } = this.option
        console.error('download error', { id, err })
        this.listener.emit('error', { id, err })
    }

    _onTimeout = (evt): void => {
        this.setState({state: STATE.FAIL})
        const { id, onTimeout } = this.option
        console.error('download timeout', id)
        onTimeout({id})
        this.listener.emit('timeout', { id })
    }

    _onLoad = (): void => {
        let { id, doneSize, progress, size } = this.option
        console.log('onload', {doneSize, size})
        this._writeFile()
            .then(() => {
                doneSize += Math.min(this.blockSize, size - doneSize)
                progress({ id, doneSize, size })
                this.listener.emit('progress', { id, doneSize, size })
                this.setState({ doneSize })
                this._checkComplete()
            })
    }

    _writeFile = () : Promise<void> => {
        const { doneSize, path } = this.option
        const arraybuffer = new Uint8Array(this._xhr.response)
        const position = doneSize
        return Util.transferBufferArrayToBase64(arraybuffer)
            .then(content => {
                return RNFS.write(path, content, position, 'base64')
            })
            .catch(this._onError)
    }

    _checkComplete = (): void => {
        const { doneSize, size } = this.option
        if (doneSize >= size) {
            this._onSuccess()
        } else {
            this._download()
        }
    }

    _download = (): Promise<DownloadTask> => {
        let { doneSize, url, size, timeout } = this.option
        this._xhr = new XMLHttpRequest()
        const startPos = doneSize
        size = size || this.blockSize
        const endPos = startPos + this.blockSize - 1
        this._xhr.open('GET', url, true)
        this._xhr.responseType = 'arraybuffer'
        this._xhr.timeout = timeout * 1000
        this._xhr.setRequestHeader('Range', `bytes=${startPos}-${endPos}`)
        this._xhr.addEventListener('readystatechange', this._onReadyStateChange)
        this._xhr.addEventListener('progress', this._onProgress)
        this._xhr.addEventListener('error', this._onError)
        this._xhr.addEventListener('timeout', this._onTimeout)
        this._xhr.addEventListener('load', this._onLoad)
        this._xhr.send()
        return Promise.resolve(this)
    }

    _checkState = (): Promise<void> => {
        const { state } = this.option
        if (state === STATE.SUCCESS || state === STATE.CANCEL || state === STATE.FAIL) {
            this.setState({ doneSize: 0, state: STATE.DOWNLOADING })
            return Promise.resolve()
        } else if (state === STATE.DOWNLOADING) {
            return Promise.reject('task is already downloading')
        }
        return Promise.resolve()
    }

    start(): Promise<void> {
        return this._checkState()
            .then(this._download)
    }

    pause(): Promise<void> {
        const {_xhr} = this
        if (_xhr) {
            _xhr.abort()
            this.setState({state: STATE.PAUSE})
            return Promise.resolve()
        }
        return Promise.reject('no downloading task')
    }

    get id (): string {
        return this.option.id
    }

    get state (): number {
        return this.option.state
    }

    set state (state: number): void {
        this.option.state = state
    }

    get url (): string {
        return this.option.url
    }

    addEventListener = this.listener.on
}