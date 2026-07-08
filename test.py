import asyncio
from core.orchestrator import run_analysis

async def main():
    async for event in run_analysis("Anthropic"):
        print(event)

if __name__ == "__main__":
    asyncio.run(main())
