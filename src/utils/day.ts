import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

// eslint-disable-next-line @typescript-eslint/no-shadow
export const getCurrentDate = (timezone: string = 'Asia/Kolkata') => {
	return dayjs().tz(timezone).format('YYYY-MM-DD');
};
