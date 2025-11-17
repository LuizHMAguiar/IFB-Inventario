export type FormData = {
  numero: string;
  descricao: string;
  sala: string;
  estado: string;
  status: string;
  etiquetado: string;
  observacao: string;
  recomendacao: string;
};

export function fillFormWithData(item:any, parsed:any): FormData {
  const f: FormData = {
    numero: parsed.numero ?? (item?.numero ?? item?.id ?? item?.etiqueta ?? ''),
    descricao: (item?.descricao ?? item?.descricao_item ?? item?.Descricao ?? '') || '',
    sala: (item?.sala ?? item?.local ?? item?.Sala ?? '') || '',
    estado: parsed.estado ?? '',
    status: parsed.status ?? '',
    etiquetado: parsed.etiquetado ?? '',
    observacao: parsed.observacao ?? (item?.observacao ?? '') ,
    recomendacao: parsed.recomendacao ?? ''
  };
  return f;
}
