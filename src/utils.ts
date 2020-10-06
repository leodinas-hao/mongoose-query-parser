import * as _ from 'lodash';
import { DateTime } from 'luxon';

/**
 * parse value to date
 * a wrapper of luxon date parsers to allow taking multiple formats
 * @param val
 * @param {string | string[]} format
 */
export function toDate(val, format?: string | string[]): DateTime {
  const formats = _.isArray(format) ? format : [format];
  let dt: DateTime;
  for (const format of formats) {
    dt = format ? DateTime.fromFormat(val, format) : DateTime.fromISO(val);
    if (dt.isValid) {
      break;
    }
  }
  return dt;
}
