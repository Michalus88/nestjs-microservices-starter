import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument, ReservationStatus } from '@app/common';

@Schema({ versionKey: false })
export class ReservationDocument extends AbstractDocument {
  @Prop()
  timestamp: Date;

  @Prop()
  startDate: Date;

  @Prop()
  endDate: Date;

  @Prop()
  userId: string;

  @Prop()
  invoiceId?: string;

  @Prop({ type: String, enum: ReservationStatus, default: ReservationStatus.PENDING })
  status: ReservationStatus;
}

export const ReservationSchema =
  SchemaFactory.createForClass(ReservationDocument);
