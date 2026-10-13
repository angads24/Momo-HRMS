import { AttendanceEventType } from '../enums';
import { LocationDto } from './location.dto';
export declare class SyncEventDto {
    clientEventId: string;
    eventType: AttendanceEventType;
    eventTime: string;
    officeId: string;
    location?: LocationDto;
    faceVerificationToken?: string;
}
export declare class SyncDto {
    events: SyncEventDto[];
}
