import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { CreateTravelDto } from './dto';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { TravelStatus } from './enums/travel-status.enum';
import { SeatStatus } from 'src/common/enums';

import { TravelSeat } from './entities/travel-seat.entity';
import { Bus } from '../buses/entities/bus.entity';
import { Travel } from './entities/travel.entity';

@Injectable()
export class TravelsService {
  constructor(
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,

    @InjectRepository(TravelSeat)
    private readonly travelSeatRepository: Repository<TravelSeat>,

    private dataSource: DataSource,
  ) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Create                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async create(createTravelDto: CreateTravelDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { busUUID, routeUUID, ...data } = createTravelDto;

      // --------------------------------------------------------------------------
      // 1. Obtener el Bus con tipo y su layout
      // --------------------------------------------------------------------------

      const busEntity = await queryRunner.manager.findOne(Bus, {
        where: { id: busUUID },
        relations: { busType: true },
      });
      if (!busEntity) throw new NotFoundException('Bus not found');

      // --------------------------------------------------------------------------
      // 2. Generar asientos del viaje segun la maquetacion del Bus
      // --------------------------------------------------------------------------

      const travelSeats = busEntity.busType.decks.flatMap((deck) =>
        deck.seats.map((seat) => ({
          ...seat,
          deck: deck.deck,
          deckType: deck.deckType,
        })),
      );

      // --------------------------------------------------------------------------
      // 3. Creacion del Travel
      // --------------------------------------------------------------------------

      const newTravel = queryRunner.manager.create(Travel, {
        ...data,
        route: { id: routeUUID },
        bus: busEntity,
        travelSeats,
      });

      await queryRunner.manager.save(newTravel);
      await queryRunner.commitTransaction();
      return newTravel;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                           Get_Seats_Available                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async getSeatsAvailable(travelId: string) {
    return await this.travelSeatRepository
      .createQueryBuilder('seat')
      .where('seat.travelId = :travelId', { travelId })
      .andWhere(
        `
      seat.status = :available
      OR (seat.status = :reserved AND seat.reserve_expiresAt < NOW())
    `,
        {
          available: SeatStatus.AVAILABLE,
          reserved: SeatStatus.RESERVED,
        },
      )
      .getMany();
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                 Closed_Travel                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  //! cerrar la salida del viaje, marcar como cerrado los asientos, marcar los asientos reservados como no vendidos, etc
  async closed() {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findAll(companyUUID: string) {
    const travels = await this.travelRepository.find({
      where: { bus: { company: { id: companyUUID } } },

      relations: {
        bus: true,
        route: { officeOrigin: true, officeDestination: true },
        travelSeats: true,
      },
    });
    return travels;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findOne(id: string, companyUUID: string) {
    const travel = await this.travelRepository.findOne({
      where: { id, bus: { company: { id: companyUUID } } },

      relations: {
        bus: true,
        route: { officeOrigin: true, officeDestination: true },
        travelSeats: true,
      },
    });
    if (!travel) throw new NotFoundException('Travel not found');
    return travel;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Cancel                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async cancel(id: string, companyUUID: string) {
    const travel = await this.findOne(id, companyUUID);

    try {
      travel.travel_status = TravelStatus.CANCELLED;
      travel.travelSeats.forEach((s) => {
        s.travel_status = TravelStatus.CANCELLED; //! se cancela el asiento
        s.deletedAt = new Date(); //! se elimina el asiento
      });

      return await this.travelRepository.save(travel);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Delete                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async remove(id: string, companyUUID: string) {
    const travel = await this.findOne(id, companyUUID);

    try {
      //! Verificar si algún asiento está en estado 'sold' o 'reserved'
      const hasSoldOrReserved = travel.travelSeats.some(
        (s) => s.status === SeatStatus.SOLD || s.status === SeatStatus.RESERVED,
      );
      if (hasSoldOrReserved) {
        throw new ConflictException(
          'Cannot cancel travel because some seats are sold or reserved',
        );
      }

      await this.travelRepository.softRemove(travel);
      return {
        message: 'Travel deleted successfully',
        deleted: travel,
      };
    } catch (error) {
      handleDBExceptions(error);
    }
  }
}
