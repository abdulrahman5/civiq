import * as migration_20261022_210630_initial from './20261022_210630_initial';
import * as migration_20261116_191646_multi_tenant from './20261116_191646_multi_tenant';
import * as migration_20261118_135149_supporters_privacy from './20261118_135149_supporters_privacy';
import * as migration_20261118_140000_row_level_security from './20261118_140000_row_level_security';

export const migrations = [
  {
    up: migration_20261022_210630_initial.up,
    down: migration_20261022_210630_initial.down,
    name: '20261022_210630_initial',
  },
  {
    up: migration_20261116_191646_multi_tenant.up,
    down: migration_20261116_191646_multi_tenant.down,
    name: '20261116_191646_multi_tenant',
  },
  {
    up: migration_20261118_135149_supporters_privacy.up,
    down: migration_20261118_135149_supporters_privacy.down,
    name: '20261118_135149_supporters_privacy',
  },
  {
    up: migration_20261118_140000_row_level_security.up,
    down: migration_20261118_140000_row_level_security.down,
    name: '20261118_140000_row_level_security',
  },
];
