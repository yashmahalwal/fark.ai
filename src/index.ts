import * as core from "@actions/core";
import * as github from "@actions/github";

async function run(): Promise<void> {
  try {
    // Get inputs from action.yml
    // const name = core.getInput('name', { required: false }) || 'World';

    // Get context
    const context = github.context;

    core.info(`Running fark-ai action...`);
    core.info(`Event: ${context.eventName}`);
    core.info(`Repository: ${context.repo.owner}/${context.repo.repo}`);

    // Add your action logic here

    // Set outputs
    // core.setOutput('result', 'success');

    core.info("Action completed successfully!");
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("Unknown error occurred");
    }
  }
}

run();
