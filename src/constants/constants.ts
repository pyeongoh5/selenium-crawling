import { CrawlerType } from '../enums';

export const isMacOS = process.platform === 'darwin';

export const CrawlerTypeList = [CrawlerType.I_TOWN_PAGE];

export const zipCodeRegex = /（〒[0-9]+-[0-9]+）/g;

export const zipNumberCodeRegex = /[0-9]+-[0-9]+/g;

export const phoneNumberRegex = /[0-9]+-[0-9]+-[0-9]+/g;

export const urlRegex = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+|(?:www\.|[-;:&=+$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[-+=&;%@.\w_]*)#?(?:[.!/\\\w]*))?)/g;

export const emailRegex = /[a-z0-9!#$%&'*+=?^_‘{|}~-]+(?:\.[a-z0-9!#$%&'*+=?^_‘{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/g;

export const minimumRow = 2;
