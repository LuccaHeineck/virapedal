-- Gravação por GPS das rotas.
--
-- distance_meters e duration_seconds já existiam à espera do GPS; a
-- altimetria não tinha onde morar. O ganho de elevação é calculado no
-- aparelho (com histerese, para não somar o ruído vertical do GPS) e gravado
-- junto com a distância a cada lote de pontos -- recalcular no banco a partir
-- de route_points repetiria o filtro em SQL sem ganho nenhum.

alter table public.routes
    add column if not exists elevation_gain_meters decimal(8,2),
    add column if not exists max_altitude_meters   decimal(8,2),
    add column if not exists min_altitude_meters   decimal(8,2);

comment on column public.routes.elevation_gain_meters is
    'Subida acumulada em metros, filtrada no app (histerese de 4 m).';

-- Os pontos sobem em lotes a partir de uma fila local. Se o insert chega ao
-- banco mas a resposta se perde (sinal ruim no meio do pedal), o lote é
-- reenviado; com este índice o reenvio vira ON CONFLICT DO NOTHING em vez de
-- duplicar o traçado. DO NOTHING só exige a policy de INSERT que já existe.
create unique index if not exists uq_route_points_route_time
    on public.route_points(route_id, recorded_at);
