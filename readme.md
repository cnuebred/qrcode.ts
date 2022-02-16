## QR code generator

---

A qr code generator written in TypeScript without using external libraries. 
I created this program for educational purposes. While coding I based on the ISO/IEC18004 standard. 
Code in the next versions will be refactored, and there will be documentation describing each operation. 
As for the generator, I plan to rewrite it in the Rust lang, also for educational purposes :p

The program allows you to generate qr code with a selected level of error correction LMQH, and in size from 1 to 40 version (21x21 - 177x177 pixels). 
It is possible to set the minimum limit of the generator's options. 
I'm also planning to add the ability to generate qr code with proper mask and in chosen encoding method (byte, numeric, alphanumeric, kanji). 
Currently available static options are mask '100' in byte coding.

```shell
>>> npm install
>>> node run dev
```

```ts
// sample usage
const app = () => {
    new QRcode("https://youtu.be/dQw4w9WgXcQ").render();
};
```

```ts
// sample usage
const app = () => {
  const options = {
    minErrorLevel: "H",
    minVersion: 2,
  };
  new QRcode("Hello world", options).render();
};
```

```ts
// sample usage
const app = () => {
    const options = {
        minErrorLevel: "L",
        minVersion: 3,
    };
    new QRcode("Hello Cube", options).render();
};