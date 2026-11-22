# Junta as partes e gera src/i18n-dict.ts. Uso: python3 scripts/i18n/build.py
import json, os, runpy
here = os.path.dirname(__file__)
D = {}
for part in sorted(f for f in os.listdir(here) if f.startswith('part') and f.endswith('.py')):
    D.update(runpy.run_path(os.path.join(here, part))['D'])
lines = ['// Gerado por scripts/i18n/build.py — edite as partes em scripts/i18n/, não este arquivo.',
         'export const DICT: Record<string, [string, string]> = {']
for k in sorted(D):
    en, es = D[k]
    lines.append(f'  {json.dumps(k, ensure_ascii=False)}: [{json.dumps(en, ensure_ascii=False)}, {json.dumps(es, ensure_ascii=False)}],')
lines.append('}')
open(os.path.join(here, '..', '..', 'src', 'i18n-dict.ts'), 'w').write('\n'.join(lines) + '\n')
print(len(D), 'traduções')
