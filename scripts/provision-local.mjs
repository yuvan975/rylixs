import {randomBytes} from 'node:crypto';
import {existsSync,writeFileSync} from 'node:fs';
if(existsSync('.env.local')) {console.log('Existing local environment preserved.');process.exit(0);}
writeFileSync('.env.local',`RYLIXS_ADMIN_EMAIL=owner@rylixs.local\nRYLIXS_ADMIN_PASSWORD=${randomBytes(24).toString('base64url')}\nRYLIXS_WHATSAPP_NUMBER=\nRYLIXS_SITE_URL=http://localhost:3100\n`,{flag:'wx'});
console.log('Private local owner credentials written to .env.local.');
