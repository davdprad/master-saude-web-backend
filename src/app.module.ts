import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { AdminUsersModule } from './modules/admin-users/admin-users.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { QueueModule } from './modules/queue/queue.module';
import { DatabaseModule } from './modules/database/database.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    AdminUsersModule,
    EmployeesModule,
    QueueModule,
  ],
  controllers: [AppController],
})
export class AppModule {}