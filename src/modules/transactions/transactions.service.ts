import { Injectable } from '@nestjs/common';

import { CreateTransactionDto, UpdateTransactionDto } from './dto';

@Injectable()
export class TransactionsService {
  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  create(createTransactionDto: CreateTransactionDto) {
    return 'This action adds a new transaction';
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  findAll() {
    return `This action returns all transactions`;
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  findOne(id: number) {
    return `This action returns a #${id} transaction`;
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  update(id: number, updateTransactionDto: UpdateTransactionDto) {
    return `This action updates a #${id} transaction`;
  }

  //? ============================================================================================== */
  //?                                        Delete                                                  */
  //? ============================================================================================== */

  remove(id: number) {
    return `This action removes a #${id} transaction`;
  }
}
