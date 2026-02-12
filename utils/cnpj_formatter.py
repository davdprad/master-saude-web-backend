import re

_CNPJ_RE = re.compile(r"^\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}$")
_CEI_RE  = re.compile(r"^\d{2}\.\d{3}\.\d{5}/\d{2}$")  # padrão comum: 00.000.00000/00

def format_cnpj_cei(value: str) -> str:
    """
    Formata CNPJ (14 dígitos) ou CEI (12 dígitos).
    - Se já estiver no formato correspondente, retorna igual.
    - Se não estiver, remove não-dígitos e formata.
    """
    if value is None:
        return value  # ou raise, dependendo do seu caso

    s = str(value).strip()

    # já formatado?
    if _CNPJ_RE.fullmatch(s) or _CEI_RE.fullmatch(s):
        return s

    digits = re.sub(r"\D", "", s)

    if len(digits) == 14:
        # CNPJ: 00.000.000/0000-00
        return f"{digits[:2]}.{digits[2:5]}.{digits[5:8]}/{digits[8:12]}-{digits[12:]}"
    elif len(digits) == 12:
        # CEI (padrão comum): 00.000.00000/00
        return f"{digits[:2]}.{digits[2:5]}.{digits[5:10]}/{digits[10:]}"
    else:
        # não bate com nenhum
        raise ValueError(f"Valor não é CNPJ (14) nem CEI (12). Dígitos={len(digits)}. Valor={value!r}")
