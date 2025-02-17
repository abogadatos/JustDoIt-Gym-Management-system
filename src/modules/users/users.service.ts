import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/database/entities/user.entity';
import { Repository } from 'typeorm';
import { TrainersCustomRepository } from '../trainers/trainers.repository';
import { ClassesCustomRepository } from './../classes/classes.repository';
import { MembershipsCustomRepository } from './../memberships/memberships.repository';
import { UpdateUserDto } from './dto/updateUser.dto';
import { UserWithoutPassword } from './types/userWithoutPassword.type';
import { UsersCustomRepository } from './users.repository';
import * as bcrypt from 'bcrypt';
import { PaymentsCustomRepository } from '../payments/payments.repository';
import { ReviewsService } from '../reviews/reviews.service';
import { RoutinesService } from '../routines/routines.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private usersCustomRepository: UsersCustomRepository,
    private trainersCustomRepository: TrainersCustomRepository,
    private classesCustomRepository: ClassesCustomRepository,
    private membershipsCustomRepository: MembershipsCustomRepository,
    private paymentsCustomRepository: PaymentsCustomRepository,
    private reviewsCustomService: ReviewsService,
    private routinesService: RoutinesService,
  ) {}

  async seedDatabase() {
    console.info(`
      Seeding memberships
          💎💎💎💎💎
    `);
    await this.membershipsCustomRepository.addMemberships();

    console.info(`
      Seeding users
        👧🧑👱👨
    `);
    await this.userSeeder();

    console.info(`
      Seeding trainers
        🏃🏽💥🏋‍♀🔥💪🏼
    `);
    await this.trainersCustomRepository.initializeTrainers();

    console.info(`
      Seeding class
       ⏳⏳⏳⏳⌛
    `);
    await this.classesCustomRepository.initializeClasses();

    console.info(`
      Seeding payments
          💳💰💸
    `);
    await this.paymentsCustomRepository.initializePayments();

    console.info(`
      Seeding reviews
             ⏳⏳⏳⏳⌛
    `);
    await this.reviewsCustomService.initializeReviews();

    console.info(`
      Seeding routines
    `);

    await this.routinesService.initializeRoutines();
  }

  async userSeeder() {
    return await this.usersCustomRepository.initializeUser();
  }

  async getUsers(
    page: number,
    limit: number,
    sortBy: string,
    order: 'ASC' | 'DESC',
  ) {
    const [users, total] = await this.usersRepository
      .createQueryBuilder('users')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy(sortBy, order)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);
    const hasPrevPage = page > 1;
    const hasNextPage = page < totalPages;
    const prevPage = hasPrevPage ? page - 1 : null;
    const nextPage = hasNextPage ? page + 1 : null;

    return {
      users,
      sortedBy: sortBy,
      ordered: order,
      totalElements: total,
      page,
      limit,
      totalPages,
      hasPrevPage,
      hasNextPage,
      prevPage,
      nextPage,
    };
  }

  async updateUser(userID: string, userInfo: UpdateUserDto) {
    const foundUser = await this.usersRepository.findOne({
      where: { id: userID },
    });
    if (!foundUser) {
      throw new NotFoundException('User not found or does not exist');
    }

    if (foundUser.banned === true) {
      console.log({
        message: `This account has been banned at ${foundUser.bannedAt}. Reason: ${foundUser.banReason || 'No reason provided.'}`,
        userData: foundUser,
      });
      foundUser.banned = false;
      foundUser.banReason = null;
      foundUser.bannedAt = null;

      const unBannedUser = this.usersRepository.update(userID, userInfo);

      return unBannedUser;
    }

    Object.keys(userInfo).forEach((key) => {
      if (
        userInfo[key] === '' ||
        userInfo[key] === null ||
        userInfo[key] === undefined
      ) {
        delete userInfo[key];
      }
    });

    if (Object.keys(userInfo).length === 0) {
      return { message: 'No changes were made' };
    }

    if (userInfo.password) {
      userInfo.password = await bcrypt.hash(userInfo.password, 10);
    }

    const updatedUser = this.usersRepository.merge(foundUser, userInfo);
    const userData = await this.usersRepository.save(updatedUser);

    return { message: 'User Updated Successfully', userData };
  }

  async getUserById(userID: string): Promise<UserWithoutPassword> {
    const foundUser: User | undefined = await this.usersRepository.findOne({
      where: { id: userID },
    });
    if (!foundUser) throw new NotFoundException('user not found or not exist');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...filteredUser } = foundUser;
    return foundUser;
  }

  async getUserByEmail(email: string): Promise<User> {
    try {
      const user = await this.usersRepository.findOne({
        where: { email },
        relations: ['payments'], // Obtener todas las relaciones, si es necesario
      });

      if (!user) {
        throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
      }

      return user;
    } catch (error) {
      throw new HttpException(
        'Error al buscar el usuario',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteUser(id: string): Promise<Partial<User>> {
    const user = await this.usersRepository.findOneBy({ id });
    this.usersRepository.remove(user);
    // const { password, ...userWithoutPass } = user;

    return user;
  }
  async updateBanStatus(userId: string, banData: Partial<User>): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
  
    // Actualiza únicamente los campos relacionados con el baneo
    user.banned = banData.banned;
    user.banReason = banData.banReason;
    user.bannedAt = banData.bannedAt;
  
    await this.usersRepository.save(user);
  }
  
}
