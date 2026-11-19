# Laboratorio SSH (Docker)

Dos servicios SSH sobre la misma imagen base **Debian stable-slim**, para
comparar una configuración **insegura** contra una **endurecida**. Todo
escucha **solo en `127.0.0.1`**; nada se expone a la red.

## Levantar / verificar / tumbar

```bash
cd lab
docker compose up -d --build     # construir y levantar
docker compose ps                # verificar estado (ambos "Up")
docker compose down              # tumbar el laboratorio
```

Prueba rápida de que responden:

```bash
nc -z 127.0.0.1 2221 && echo "inseguro OK"
nc -z 127.0.0.1 2222 && echo "endurecido OK"
```

Login legítimo en el endurecido (solo clave pública):

```bash
ssh -i keys/lab_key -p 2222 axel@127.0.0.1
```

## Los dos contenedores

| Aspecto | `ssh-inseguro` (2221) | `ssh-endurecido` (2222) |
|---|---|---|
| Login de root (`PermitRootLogin`) | `yes` ❌ | `no` ✅ |
| Contraseñas (`PasswordAuthentication`) | `yes` ❌ | `no` (solo clave) ✅ |
| Clave pública (`PubkeyAuthentication`) | `yes` | `yes` |
| Intentos máximos (`MaxAuthTries`) | `6` | `3` ✅ |
| `AllowUsers` | (sin restringir) | `axel` ✅ |
| Usuario de prueba | `axel` / `password123` ❌ | `axel` (solo clave) ✅ |
| KEX | incluye `diffie-hellman-group1-sha1` (SHA-1) ❌ | `sntrup761x25519`, `curve25519-sha256` ✅ |
| Cifrados | incluye `3des-cbc`, `*-cbc` ❌ | `chacha20-poly1305`, `aes*-gcm` ✅ |
| MAC | incluye `hmac-md5`, `hmac-sha1`, `umac-64` ❌ | `hmac-sha2-*-etm` ✅ |
| Clave de host ofrecida | RSA/SHA-1 (`ssh-rsa`) + ecdsa + ed25519 ❌ | solo `ssh-ed25519` ✅ |

❌ = debilidad a propósito · ✅ = control aplicado

## Claves

- El par ed25519 vive en `lab/keys/` (`lab_key` privada, `lab_key.pub` pública).
- La **privada `lab_key` está en `.gitignore`** y nunca se versiona.
- El endurecido monta la pública como `authorized_keys` del usuario `axel`.

## Nota sobre `fail2ban`

Se omitió `fail2ban` por alcance (ver *Limitaciones* en la documentación
principal). La contención se cubre con `MaxAuthTries 3`, `AllowUsers` y el
hecho de que la autenticación por contraseña está deshabilitada. Queda como
mejora futura.
