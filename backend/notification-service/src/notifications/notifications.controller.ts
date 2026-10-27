import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Sse,
  ValidationPipe,
  UsePipes,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { SseService } from './sse.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';

@ApiTags('Notifications')
@Controller('notifications')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly sseService: SseService,
  ) {}

  @Post('send')
  @ApiOperation({ summary: 'Send an in-app notification (Internal / Service-to-Service)' })
  @ApiResponse({ status: 201, description: 'Notification created and broadcasted via SSE' })
  async send(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }

  @Post()
  @ApiOperation({ summary: 'Create and dispatch an in-app notification' })
  @ApiResponse({ status: 201, description: 'Notification created and broadcasted via SSE' })
  async createNotification(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List notifications for a user/employee with pagination' })
  async findAll(@Query() query: QueryNotificationsDto, @Req() req: Request) {
    const headerUserId = req?.headers['x-user-id'] as string;
    const headerEmpId = req?.headers['x-employee-id'] as string;
    const headerRole = req?.headers['x-roles'] as string;
    const headerEmail = req?.headers['x-email'] as string;

    const effectiveRecipientId = query.recipientId || headerEmpId || headerUserId;
    const effectiveEmail = query.email || headerEmail;
    const effectiveRole = query.role || headerRole;

    const userCandidates = Array.from(
      new Set([headerEmpId, headerUserId, effectiveEmail, query.recipientId].filter(Boolean)),
    ) as string[];

    return this.notificationsService.findAll(
      {
        ...query,
        recipientId: effectiveRecipientId,
        email: effectiveEmail,
        role: effectiveRole,
      },
      userCandidates,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count for a recipient' })
  @ApiQuery({ name: 'recipientId', required: false, type: String })
  @ApiQuery({ name: 'email', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, type: String })
  async getUnreadCount(
    @Query('recipientId') recipientId?: string,
    @Query('email') email?: string,
    @Query('role') role?: string,
    @Req() req?: Request,
  ) {
    const headerUserId = req?.headers['x-user-id'] as string;
    const headerEmpId = req?.headers['x-employee-id'] as string;
    const headerRole = req?.headers['x-roles'] as string;
    const headerEmail = req?.headers['x-email'] as string;

    const effectiveRecipientId = recipientId || headerEmpId || headerUserId;
    const effectiveEmail = email || headerEmail;
    const effectiveRole = role || headerRole;
    const userCandidates = Array.from(
      new Set([headerEmpId, headerUserId, effectiveEmail, recipientId].filter(Boolean)),
    ) as string[];

    return this.notificationsService.getUnreadCount(effectiveRecipientId, effectiveEmail, effectiveRole, userCandidates);
  }

  @Sse('stream')
  @ApiOperation({ summary: 'Real-time Server-Sent Events (SSE) notification stream for web and mobile' })
  @ApiQuery({ name: 'recipientId', required: false, type: String })
  @ApiQuery({ name: 'email', required: false, type: String })
  stream(
    @Query('recipientId') recipientId?: string,
    @Query('email') email?: string,
    @Req() req?: Request,
  ): Observable<MessageEvent> {
    const headerUserId = req?.headers['x-user-id'] as string;
    const headerEmpId = req?.headers['x-employee-id'] as string;
    const headerEmail = req?.headers['x-email'] as string;

    const effectiveId = recipientId || headerEmpId || headerUserId || 'ALL';
    const effectiveEmail = email || headerEmail;

    return this.sseService.getRecipientStream(effectiveId, effectiveEmail);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single notification details' })
  async findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiQuery({ name: 'recipientId', required: false, type: String })
  @ApiQuery({ name: 'email', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  async markAsRead(
    @Param('id') id: string,
    @Query('recipientId') queryRecipientId?: string,
    @Query('email') queryEmail?: string,
    @Query('userId') queryUserId?: string,
    @Body() body?: any,
    @Req() req?: Request,
  ) {
    const headerUserId = req?.headers['x-user-id'] as string;
    const headerEmpId = req?.headers['x-employee-id'] as string;
    const headerEmail = req?.headers['x-email'] as string;
    const userCandidates = Array.from(
      new Set([
        headerEmpId,
        headerUserId,
        headerEmail,
        queryRecipientId,
        queryEmail,
        queryUserId,
        body?.recipientId,
        body?.email,
        body?.userId,
      ].filter(Boolean)),
    ) as string[];
    return this.notificationsService.markAsRead(id, userCandidates);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for a recipient' })
  @ApiQuery({ name: 'recipientId', required: false, type: String })
  @ApiQuery({ name: 'email', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, type: String })
  async markAllAsRead(
    @Query('recipientId') recipientId?: string,
    @Query('email') email?: string,
    @Query('role') role?: string,
    @Body() body?: any,
    @Req() req?: Request,
  ) {
    const headerUserId = req?.headers['x-user-id'] as string;
    const headerEmpId = req?.headers['x-employee-id'] as string;
    const headerRole = req?.headers['x-roles'] as string;
    const headerEmail = req?.headers['x-email'] as string;

    const effectiveRecipientId = recipientId || body?.recipientId || headerEmpId || headerUserId;
    const effectiveEmail = email || body?.email || headerEmail;
    const effectiveRole = role || body?.role || headerRole;
    const userCandidates = Array.from(
      new Set([headerEmpId, headerUserId, effectiveEmail, effectiveRecipientId].filter(Boolean)),
    ) as string[];
    return this.notificationsService.markAllAsRead(effectiveRecipientId, effectiveEmail, effectiveRole, userCandidates);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete or dismiss a notification' })
  @ApiQuery({ name: 'hard', required: false, type: Boolean })
  @ApiQuery({ name: 'userId', required: false, type: String })
  async remove(
    @Param('id') id: string,
    @Query('hard') hard?: string,
    @Query('userId') queryUserId?: string,
    @Req() req?: Request,
  ) {
    const headerUserId = req?.headers['x-user-id'] as string;
    const headerEmpId = req?.headers['x-employee-id'] as string;
    const callerId = queryUserId || headerUserId || headerEmpId;
    const isHard = hard === 'true';

    return this.notificationsService.remove(id, callerId, isHard);
  }
}
