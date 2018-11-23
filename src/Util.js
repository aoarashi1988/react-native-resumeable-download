export default class Util {
    static transferBufferArrayToBase64(arrayBuffer: ArrayBuffer): Promise<string> {
        return new Promise((resolve, reject) => {
            const blockSize = 1024 * 2
            let position = 0
            let str = ''
            function pump() {
                if (position >= arrayBuffer.length) {
                    const base64 = btoa(str)
                    resolve(base64)
                } else {
                    const cbuffer = arrayBuffer.slice(position, position + blockSize )
                    str += String.fromCodePoint(...cbuffer)
                    position += blockSize
                    pump()
                }
            }
            pump()
        })
    }

    static randomUUID(): string {
        var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('')
        var uuid = new Array(36),
            rnd = 0,
            r
        for (var i = 0; i < 36; i++) {
            if (i === 8 || i === 13 || i == 18 || i == 23) {
                uuid[i] = '-'
            } else if (i === 14) {
                uuid[i] = '4'
            } else {
                if (rnd <= 0x02)
                    rnd = 0x2000000 + (Math.random() * 0x1000000) | 0
                r = rnd & 0xf
                rnd = rnd >> 4
                uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r]
            }
        }
        return uuid.join('').replace(/-/gm, '').toLowerCase()
    }
}