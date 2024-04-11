import { Injectable } from '@nestjs/common';
import type Logger from '@/logger.js';
import { bindThis } from '@/decorators.js';
import { MetaService } from '@/core/MetaService.js';
import { PatreonManagementService } from '@/core/integrations/PatreonManagementService.js';
import { FanboxManagementService } from '@/core/integrations/FanboxManagementService.js';
import { QueueLoggerService } from '../QueueLoggerService.js';

@Injectable()
export class IntegrationDaemonProcessorService {
	private logger: Logger;

	constructor(
		private queueLoggerService: QueueLoggerService,
		private metaService: MetaService,
		private patreonManagementService: PatreonManagementService,
		private fanboxManagementService: FanboxManagementService,
	) {
		this.logger = this.queueLoggerService.logger.createSubLogger('integration-daemon');
	}

	@bindThis
	public async process(): Promise<void> {
		const meta = await this.metaService.fetch();

		if (meta.enableFanboxIntegration) {
			this.fanboxManagementService.update();
		}

		if (meta.enablePatreonIntegration) {
			this.patreonManagementService.update();
		}
	}
}
