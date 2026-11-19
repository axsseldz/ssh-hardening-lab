#!/bin/sh
# Instala la clave pública autorizada con permisos correctos (sshd es
# estricto con la propiedad y permisos de ~/.ssh) y arranca sshd.
set -e

mkdir -p /home/axel/.ssh
if [ -f /keys/lab_key.pub ]; then
    cp /keys/lab_key.pub /home/axel/.ssh/authorized_keys
else
    echo "ADVERTENCIA: no se encontró /keys/lab_key.pub" >&2
    : > /home/axel/.ssh/authorized_keys
fi
chown -R axel:axel /home/axel/.ssh
chmod 700 /home/axel/.ssh
chmod 600 /home/axel/.ssh/authorized_keys

exec /usr/sbin/sshd -D -e
