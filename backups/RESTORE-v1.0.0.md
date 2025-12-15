# Restauración de Nexbook v1.0.0-audit

Este backup contiene el estado de la base de datos (SQLite) y el código fuente antes de la implementación de Skins y Temas.

## Restaurar Código

```bash
git checkout v1.0.0-audit
npm install
npm run build
```

## Restaurar Base de Datos (SQLite)

1. Detener la aplicación.
2. Descomprimir el backup:

```bash
tar -xzf backups/v1.0.0-audit.tar.gz -C .
# Esto restaurará prisma/dev.db
```

3. Verificar integridad:

```bash
npx prisma studio
```
