# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Salvar bases em arquivos .sqlite

Ao importar uma planilha a aplicação tentará oferecer um download do arquivo `.sqlite` (nome sugerido `data/<nome>.sqlite`).

Para salvar todas as bases persistidas (localStorage) no disco do projeto, gere um arquivo `manifest.json` com o conteúdo do storage `ifb_saved_bases` e execute o script Node:

```powershell
node scripts/save_bases_to_disk.js path/to/manifest.json
# os arquivos .sqlite serão escritos em ./data/
```

Observação: navegadores não permitem gravar diretamente em pastas do projeto; o download gera um arquivo que o usuário deve salvar manualmente. O script Node é uma alternativa para gravar no repositório local a partir de um manifest JSON.

### Servidor local para salvar .db automaticamente

Você pode executar um pequeno servidor Node que aceita POSTs para gravar o arquivo `.db` diretamente em `./data/`.

1. Instale dependências (se necessário):

```powershell
npm install express
```

2. Inicie o servidor:

```powershell
node server/save-db-server.js
```

3. Ao importar uma planilha pela UI, a aplicação tentará enviar o banco gerado para `http://localhost:3001/save-db` e o servidor gravará `./data/<nome>.db` automaticamente.

Se o servidor não estiver rodando, a aplicação fará o download do arquivo no navegador como fallback.

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
