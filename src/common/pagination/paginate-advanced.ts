import { Repository, ObjectLiteral } from 'typeorm';
import { PaginationDto } from './pagination.dto';

export async function paginateAdvanced<T extends ObjectLiteral>(
  repository: Repository<T>,
  paginationDto: PaginationDto,
  searchableFields: string[] = [],
  relations: string[] = [],
  order: Record<string, 'ASC' | 'DESC'> = { id: 'ASC' },
  caseInsensitive = true,
) {
  const page = paginationDto.page ?? 1;
  const limit = paginationDto.limit ?? 10;
  const skip = (page - 1) * limit;
  const { search } = paginationDto;

  const qb = repository.createQueryBuilder('entity');

  //! Relaciones dinámicas (soporta anidadas)
  for (const rel of relations) {
    // Para relaciones anidadas como 'variants.size'
    if (rel.includes('.')) {
      const [parentRel, childRel] = rel.split('.');
      qb.leftJoinAndSelect(`entity.${parentRel}`, parentRel).leftJoinAndSelect(
        `${parentRel}.${childRel}`,
        childRel,
      );
    } else {
      qb.leftJoinAndSelect(`entity.${rel}`, rel);
    }
  }

  //! Búsqueda
  if (search && searchableFields.length > 0) {
    const conditions = searchableFields.map((field) => {
      // Para campos anidados como 'variants.size.name'
      const column = field.includes('.') ? field : `entity.${field}`;
      return caseInsensitive
        ? `${column} ILIKE :search`
        : `${column} LIKE :search`;
    });
    qb.andWhere(conditions.join(' OR '), { search: `%${search}%` });
  }

  //! Ordenamiento
  Object.entries(order).forEach(([field, direction]) => {
    const orderField = field.includes('.') ? field : `entity.${field}`;
    qb.addOrderBy(orderField, direction);
  });

  qb.skip(skip).take(limit);

  const [data, total] = await qb.getManyAndCount();
  const lastPage = Math.ceil(total / limit);

  return {
    data,
    meta: {
      total,
      page,
      lastPage,
      limit,
      offset: skip,
      hasNextPage: page < lastPage,
      hasPreviousPage: page > 1,
    },
  };
}
