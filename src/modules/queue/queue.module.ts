import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';

@Module({
  imports: [DatabaseModule],
  controllers: [QueueController],
  providers: [QueueService],
})
export class QueueModule {}