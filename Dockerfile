# Usamos una imagen que ya tiene PHP y Apache configurados
FROM php:8.2-apache

# Instalamos extensiones necesarias (como cURL para hablar con OpenRouter)
RUN apt-get update && apt-get install -y libcurl4-openssl-dev pkg-config libssl-dev && \
    docker-php-ext-install curl

# Copiamos tus 52 capítulos, audios y el archivo PHP al servidor de Render
COPY . /var/www/html/

# Damos permisos para que el servidor pueda leer los archivos
RUN chown -R www-data:www-data /var/www/html

# Exponemos el puerto estandar
EXPOSE 80
