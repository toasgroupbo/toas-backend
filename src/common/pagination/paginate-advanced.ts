/* import { Repository, ObjectLiteral } from 'typeorm';
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
 */

import { Repository, ObjectLiteral, FindOptionsWhere, FindOperator } from 'typeorm';

import { PaginationDto } from './pagination.dto';

export async function paginateAdvanced<T extends ObjectLiteral>(
  repository: Repository<T>,
  paginationDto: PaginationDto,
  searchableFields: string[] = [],
  relations: string[] = [],
  order: Record<string, 'ASC' | 'DESC'> = { id: 'ASC' },
  caseInsensitive = true,

  //! NUEVO
  where?: FindOptionsWhere<T> | FindOptionsWhere<T>[],
) {
  const page = paginationDto.page ?? 1;
  const limit = paginationDto.limit ?? 10;

  const skip = (page - 1) * limit;

  const { search } = paginationDto;

  const qb = repository.createQueryBuilder('entity');

  //! RELATIONS
  for (const rel of relations) {
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

  //! WHERE
  if (where) {
    const applyWhere = (conditions: any, alias: string = 'entity') => {
      for (const [key, value] of Object.entries(conditions)) {
        const paramKey = `${alias}_${key}`.replace(/\./g, '_');

        if (value instanceof FindOperator) {
          const type = (value as any).type as string;
          if (type === 'between') {
            const [start, end] = (value as any).value as [any, any];
            qb.andWhere(
              `${alias}.${key} BETWEEN :${paramKey}Start AND :${paramKey}End`,
              { [`${paramKey}Start`]: start, [`${paramKey}End`]: end },
            );
          } else {
            qb.andWhere(`${alias}.${key} = :${paramKey}`, {
              [paramKey]: (value as any).value,
            });
          }
        } else if (value !== null && value !== undefined && typeof value === 'object') {
          applyWhere(value, key);
        } else if (value !== null && value !== undefined) {
          qb.andWhere(`${alias}.${key} = :${paramKey}`, { [paramKey]: value });
        }
      }
    };

    applyWhere(where);
  }

  //! SEARCH
  if (search && searchableFields.length > 0) {
    const conditions = searchableFields.map((field) => {
      const column = field.includes('.') ? field : `entity.${field}`;

      return caseInsensitive
        ? `${column} ILIKE :search`
        : `${column} LIKE :search`;
    });

    qb.andWhere(`(${conditions.join(' OR ')})`, {
      search: `%${search}%`,
    });
  }

  //! ORDER
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
