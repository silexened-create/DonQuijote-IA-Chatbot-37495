# Usamos una imagen que ya tiene PHP y Apache configurados
FROM php:8.2-apache

# Instalamos extensiones necesarias (como cURL para hablar con OpenRouter)
RUN apt-get update && apt-get install -y libcurl4-openssl-dev pkg-config libssl-dev && \
    docker-php-ext-install curl
    
# 1. Habilita el módulo de cabeceras (Indispensable para CORS)
RUN a2enmod headers

# 2. Configura Apache para que acepte archivos .htaccess
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf
# Copiamos tus 52 capítulos, audios y el archivo PHP al servidor de Render
COPY . /var/www/html/

# Damos permisos para que el servidor pueda leer los archivos
RUN chown -R www-data:www-data /var/www/html

# Exponemos el puerto estandar
EXPOSE 80
