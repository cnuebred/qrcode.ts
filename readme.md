## QR code generator

---

_without libs, based only on standards_

version: **v1**

```shell
npm install
node run dev
```

```ts
// *main.ts*
// sample usage
const app = () => {
  const options = {
    minErrorLevel: "H",
    minVersion: 2,
  };
  new QRcode("Hello world", options).render();
};
```
