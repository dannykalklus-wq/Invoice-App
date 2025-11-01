```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};
export default nextConfig;
```

---

### 3. `postcss.config.mjs`
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```
