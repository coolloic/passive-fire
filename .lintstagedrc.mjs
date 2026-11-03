const config = {
  "*.{ts,tsx,js,mjs,cjs}": ["prettier --write", "eslint --max-warnings=0 --fix"],
  "*.{json,md,css,yml,yaml}": ["prettier --write"],
};

export default config;
