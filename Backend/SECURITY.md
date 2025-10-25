# Seguridad y Protección de Datos

Este documento describe las medidas de seguridad implementadas en el sistema.

## 1. HTTPS / SSL/TLS

### Configuración Nginx
```nginx
server {
    listen 443 ssl http2;
    server_name academic.example.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}

# Redirigir HTTP a HTTPS
server {
    listen 80;
    server_name academic.example.com;
    return 301 https://$server_name$request_uri;
}
```

### Obtener certificado SSL (Let's Encrypt)
```bash
# Instalar certbot
apt-get install certbot python3-certbot-nginx

# Obtener certificado
certbot --nginx -d academic.example.com

# Renovación automática
certbot renew --dry-run
```

## 2. CORS (Cross-Origin Resource Sharing)

### Configuración en Laravel
Archivo: `config/cors.php`

```php
return [
    'paths' => ['api/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        'https://academic.example.com',
        'https://app.academic.example.com',
    ],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
```

## 3. Rate Limiting

### Configuración Implementada

#### Autenticación
- **Login**: 5 intentos/minuto por IP
- **Register**: 10 intentos/minuto por IP

#### API General
- **Endpoints protegidos**: 100 requests/minuto por usuario autenticado

### Implementación
```php
// routes/api.php
Route::post('/login')->middleware('throttle:5,1');
Route::middleware(['throttle:100,1'])->group(function () {
    // Rutas protegidas
});
```

### Respuesta cuando se excede el límite
```json
{
    "message": "Too Many Attempts.",
    "retry_after": 60
}
```

## 4. Logging de Operaciones

### Middleware LogOperations
Registra todas las operaciones importantes (POST, PUT, DELETE):

```json
{
    "timestamp": "2025-10-22T16:30:00Z",
    "user_id": 123,
    "user_email": "usuario@example.com",
    "ip": "192.168.1.100",
    "method": "POST",
    "path": "api/asistencias",
    "status_code": 201,
    "execution_time_ms": 145.23,
    "success": true
}
```

### Ubicación de logs
- **Operaciones**: `storage/logs/operations.log`
- **Aplicación**: `storage/logs/laravel.log`
- **Retención**: 30 días

### Ver logs en tiempo real
```bash
# Logs de operaciones
tail -f storage/logs/operations.log

# Logs de aplicación
tail -f storage/logs/laravel.log
```

## 5. Health Check

### Endpoint
`GET /api/health`

### Respuesta
```json
{
    "status": "healthy",
    "timestamp": "2025-10-22T16:30:00Z",
    "service": "Academic Management API",
    "version": "1.0.0",
    "checks": {
        "database_oltp": "ok",
        "database_olap": "ok",
        "redis": "ok"
    }
}
```

### Monitoreo
- Status 200: Sistema saludable
- Status 503: Sistema con problemas

## 6. Fail2Ban (Protección contra ataques)

### Instalación
```bash
apt-get install fail2ban
```

### Configuración
Archivo: `/etc/fail2ban/jail.local`

```ini
[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/error.log
findtime = 600
bantime = 900
maxretry = 10

[nginx-auth]
enabled = true
filter = nginx-auth
action = iptables-multiport[name=NoAuthFailures, port="http,https", protocol=tcp]
logpath = /var/log/nginx/error.log
findtime = 600
bantime = 900
maxretry = 5
```

### Comandos útiles
```bash
# Ver IPs bloqueadas
fail2ban-client status nginx-limit-req

# Desbloquear IP
fail2ban-client set nginx-limit-req unbanip 192.168.1.100

# Ver logs
tail -f /var/log/fail2ban.log
```

## 7. Backups Automáticos

### Script de Backup
Ubicación: `scripts/backup.sh`

### Configuración
- **Frecuencia**: Diaria (cron)
- **Retención**: 7 días
- **Bases de datos**: academic_oltp, academic_olap
- **Compresión**: gzip

### Configurar cron
```bash
# Editar crontab
crontab -e

# Agregar línea (backup diario a las 2 AM)
0 2 * * * /path/to/scripts/backup.sh >> /var/log/backup.log 2>&1
```

### Restore manual
```bash
./scripts/restore.sh academic_oltp /var/backups/academic/academic_oltp_20251022_020000.sql.gz
```

## 8. Variables de Entorno Sensibles

### Archivo .env
**NUNCA** commitear el archivo `.env` al repositorio.

### Variables críticas
```env
# Base de datos
DB_PASSWORD=strong_password_here

# Redis
REDIS_PASSWORD=redis_password_here

# JWT/Sanctum
APP_KEY=base64:generated_key_here

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

### Generar APP_KEY
```bash
php artisan key:generate
```

## 9. Protección de Datos

### Encriptación
- Contraseñas: bcrypt (Laravel Hash)
- Tokens: SHA-256
- Comunicación: TLS 1.2+

### Validación de Inputs
Todas las requests son validadas:
```php
$validator = Validator::make($request->all(), [
    'email' => 'required|email',
    'puntaje' => 'required|numeric|between:0,20',
]);
```

### SQL Injection Prevention
- Uso de Eloquent ORM
- Prepared statements en funciones PostgreSQL
- Validación de tipos de datos

## 10. Headers de Seguridad

### Configuración Nginx
```nginx
# Prevenir clickjacking
add_header X-Frame-Options "SAMEORIGIN" always;

# Prevenir MIME sniffing
add_header X-Content-Type-Options "nosniff" always;

# XSS Protection
add_header X-XSS-Protection "1; mode=block" always;

# Content Security Policy
add_header Content-Security-Policy "default-src 'self'" always;

# Referrer Policy
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

## 11. Auditoría y Compliance

### Logs de Auditoría
Todos los cambios importantes son registrados:
- Creación/modificación de asistencias
- Creación/modificación de notas
- Cambios en usuarios
- Intentos de acceso no autorizado

### Retención de Datos
- Logs operacionales: 30 días
- Logs de aplicación: 14 días
- Backups: 7 días

## 12. Checklist de Seguridad

### Antes de Producción
- [ ] Configurar HTTPS con certificado válido
- [ ] Configurar CORS con dominios específicos
- [ ] Habilitar Fail2Ban
- [ ] Configurar backups automáticos
- [ ] Revisar permisos de archivos (storage, logs)
- [ ] Cambiar todas las contraseñas por defecto
- [ ] Configurar firewall (ufw)
- [ ] Deshabilitar debug mode (`APP_DEBUG=false`)
- [ ] Configurar monitoring (opcional)
- [ ] Revisar logs de seguridad

### Firewall (ufw)
```bash
# Habilitar firewall
ufw enable

# Permitir solo puertos necesarios
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS

# Ver status
ufw status
```

## 13. Contacto de Seguridad

Para reportar vulnerabilidades de seguridad:
- Email: security@academic.example.com
- No publicar vulnerabilidades públicamente
- Tiempo de respuesta: 48 horas

## 14. Actualizaciones de Seguridad

### Mantener el sistema actualizado
```bash
# Actualizar dependencias PHP
composer update

# Actualizar sistema operativo
apt-get update && apt-get upgrade

# Verificar vulnerabilidades conocidas
composer audit
```

### Monitoreo de CVEs
- Suscribirse a alertas de seguridad de Laravel
- Revisar dependencias regularmente
- Aplicar parches de seguridad inmediatamente
