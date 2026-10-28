"""Entorno de Alembic: migraciones de los modelos de cuaderno.modelos (T-05)."""

from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel

import cuaderno.modelos  # noqa: F401  (registra las tablas en SQLModel.metadata)
from alembic import context
from cuaderno.config import leer_config

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Las pruebas fijan la URL de su base de datos con set_main_option; si no, se usa URL_BASE_DATOS.
if not config.get_main_option("sqlalchemy.url"):
    config.set_main_option("sqlalchemy.url", leer_config().url_base_datos)

target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    """Genera el SQL de las migraciones sin conectarse a la base de datos."""
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Aplica las migraciones sobre la base de datos."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
