"""Prueba de humo del esqueleto (T-01): el paquete se importa."""


def test_paquete_cuaderno_se_importa() -> None:
    import cuaderno

    assert cuaderno.__doc__
