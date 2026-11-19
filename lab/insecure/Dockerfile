# Contenedor INSEGURO a propósito — ssh-inseguro
# Imagen Linux ligera con OpenSSH server.
FROM debian:stable-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssh-server \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /run/sshd

# Usuario de prueba con contraseña DÉBIL (está en el diccionario del ataque).
RUN useradd -m -s /bin/bash axel \
    && echo 'axel:password123' | chpasswd \
    && echo 'root:toor' | chpasswd

# Config débil a propósito (ver comentarios dentro del archivo).
COPY sshd_config /etc/ssh/sshd_config

# Regenera claves de host (rsa+ecdsa+ed25519). Se incluye RSA para poder
# ofrecer ssh-rsa (SHA-1), que ssh-audit marcará como débil.
RUN rm -f /etc/ssh/ssh_host_* && ssh-keygen -A

EXPOSE 22
CMD ["/usr/sbin/sshd", "-D", "-e"]
