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

## Banco de dados Supabase

A aplicação persiste as bases e alterações no PostgreSQL do Supabase. As tabelas `inventory_databases` e `inventory_items` são criadas automaticamente pela API na primeira execução.

Configure o `.env` com os dados do banco no Supabase (Project Settings > Database > Connection parameters). A senha não deve ser publicada nem adicionada ao controle de versão:

```env
VITE_SUPABASE_DB_HOST=db.<project-ref>.supabase.co
VITE_SUPABASE_DB_PORT=5432
VITE_SUPABASE_DB_NAME=postgres
VITE_SUPABASE_DB_USER=postgres
VITE_SUPABASE_DB_PASSWORD=sua-senha-do-banco
VITE_SUPABASE_DB_SSL=true
VITE_SUPABASE_DB_URL=
VITE_API_PORT=3001
```

Se o host `db.<project-ref>.supabase.co` não resolver na sua rede, copie no campo `VITE_SUPABASE_DB_URL` a conexão `Session pooler` ou `Transaction pooler` exibida em Project Settings > Database > Connect. Nesse caso, mantenha a URL entre aspas e substitua `[YOUR-PASSWORD]` pela senha real.

Instale as dependências e inicie a interface e a API juntas:

```powershell
npm install
npm run dev
```

Execute `npm run dev`. A API conecta ao Supabase e o Vite encaminha as chamadas para `http://127.0.0.1:3001`. Abra o endereço local exibido pelo Vite (normalmente `http://localhost:5173`).

Na primeira abertura, bases ainda existentes no `localStorage` (`inventory_databases`) são copiadas para o Supabase e removidas do armazenamento do navegador após a confirmação das gravações. O arquivo SQLite local antigo não é migrado automaticamente.

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
