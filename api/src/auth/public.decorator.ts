import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Bu endpoint'i JWT guard'dan muaf tutar (login, webhook gibi). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
