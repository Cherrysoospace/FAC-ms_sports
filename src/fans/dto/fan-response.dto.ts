export class FanResponseDto {
  id!: number;
  securityUserId!: number;
  fullName!: string;
  documentNumber!: string;
  email!: string;
  phone!: string | null;
  active!: boolean;
  createdAt!: Date;
  favoriteTeamsCount!: number;
}
