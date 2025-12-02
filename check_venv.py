import sys
import os

print("--- Información del Entorno Python ---")
print(f"Ejecutable de Python: {sys.executable}")
print(f"Prefijo (sys.prefix): {sys.prefix}")
print(f"Variable VIRTUAL_ENV: {os.environ.get('VIRTUAL_ENV', 'No definida')}")
print("--------------------------------------")
