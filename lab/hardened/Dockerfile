# Contenedor ENDURECIDO — ssh-endurecido
# Misma imagen base; diferencia = configuración segura.
FROM debian:stable-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssh-server \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /run/sshd

# Usuario sin privilegios; SIN contraseña utilizable (solo clave pública).
RUN useradd -m -s /bin/bash axel

# Contexto de build = carpeta lab/ (ver docker-compose.yml) para poder
# incluir la clave PÚBLICA. La privada queda excluida por .dockerignore.
COPY hardened/sshd_config /etc/ssh/sshd_config
COPY hardened/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY keys/lab_key.pub /keys/lab_key.pub
RUN chmod +x /usr/local/bin/entrypoint.sh

# Solo clave de host ed25519 (moderna); se eliminan las demás.
RUN rm -f /etc/ssh/ssh_host_* \
    && ssh-keygen -t ed25519 -f /etc/ssh/ssh_host_ed25519_key -N ''

EXPOSE 22
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
