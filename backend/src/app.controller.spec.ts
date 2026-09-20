import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should redirect to /graphql', () => {
      const meta = Reflect.getMetadata('__redirect__', appController.root);
      expect(meta).toEqual({ url: '/graphql', statusCode: 302 });
    });
  });
});
